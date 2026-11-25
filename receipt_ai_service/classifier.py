import math
from functools import lru_cache


CATEGORY_PROTOTYPES = {
    "food": (
        "Chi phí ăn uống tại nhà hàng, quán ăn, quán cà phê, cửa hàng thực phẩm và siêu thị.",
        "Mua đồ ăn, thức uống, cà phê, trà sữa, thực phẩm và hàng tạp hóa.",
    ),
    "transport": (
        "Chi phí đi lại bằng taxi, xe buýt, xe công nghệ, tàu xe, xăng dầu và bãi đỗ xe.",
        "Thanh toán vé phương tiện công cộng, phí di chuyển và nhiên liệu.",
    ),
    "shopping": (
        "Chi phí mua sắm quần áo, đồ dùng cá nhân, điện tử và hàng hóa bán lẻ.",
        "Mua hàng tại cửa hàng, trung tâm thương mại hoặc cửa hàng trực tuyến.",
    ),
    "utilities": (
        "Hóa đơn tiền điện, nước, internet, điện thoại và các dịch vụ tiện ích.",
        "Thanh toán cước viễn thông, hóa đơn điện nước và dịch vụ sinh hoạt.",
    ),
    "housing": (
        "Chi phí thuê nhà, căn hộ, phòng trọ và dịch vụ nhà ở.",
        "Thanh toán tiền thuê phòng hoặc tiền thuê bất động sản.",
    ),
    "other": (
        "Khoản chi tiêu khác không thuộc ăn uống, đi lại, mua sắm, hóa đơn tiện ích hoặc nhà ở.",
        "Thanh toán cho dịch vụ và hàng hóa không được xếp vào nhóm chi phí phổ biến.",
    ),
}

MIN_SIMILARITY = 0.56
MIN_MARGIN = 0.04


def select_category(scores: dict[str, float]) -> dict[str, str | float] | None:
    ranked = sorted(
        ((category, score) for category, score in scores.items() if math.isfinite(score)),
        key=lambda item: item[1],
        reverse=True,
    )
    if len(ranked) < 2:
        return None

    best, second = ranked[0], ranked[1]
    if best[1] < MIN_SIMILARITY or best[1] - second[1] < MIN_MARGIN:
        return None
    return {"value": best[0], "confidence": max(0.0, min(1.0, best[1]))}


class PhoBertCategoryClassifier:
    def __init__(self) -> None:
        import torch
        from transformers import AutoModel, AutoTokenizer
        from underthesea import word_tokenize

        self._torch = torch
        self._word_tokenize = word_tokenize
        self._tokenizer = AutoTokenizer.from_pretrained("vinai/phobert-base-v2")
        self._model = AutoModel.from_pretrained("vinai/phobert-base-v2", add_pooling_layer=False)
        self._model.eval()

        categories = list(CATEGORY_PROTOTYPES)
        examples = [
            self._segment(example)
            for category in categories
            for example in CATEGORY_PROTOTYPES[category]
        ]
        vectors = self._encode(examples)
        self._prototypes = {
            category: self._normalize(
                self._mean(vectors[index * 2 : index * 2 + 2], axis=0)
            )
            for index, category in enumerate(categories)
        }

    def _segment(self, text: str) -> str:
        return self._word_tokenize(text[:4000], format="text")

    def _encode(self, texts: list[str]):
        torch = self._torch
        tokens = self._tokenizer(
            texts,
            padding=True,
            truncation=True,
            max_length=256,
            return_tensors="pt",
        )
        with torch.no_grad():
            hidden = self._model(**tokens).last_hidden_state
            mask = tokens["attention_mask"].unsqueeze(-1).expand(hidden.size()).float()
            vectors = (hidden * mask).sum(dim=1) / mask.sum(dim=1).clamp(min=1)
            return torch.nn.functional.normalize(vectors, p=2, dim=1)

    @staticmethod
    def _mean(vectors, axis: int):
        return vectors.mean(dim=axis)

    @staticmethod
    def _normalize(vector):
        return vector / vector.norm(p=2).clamp(min=1e-12)

    def classify(self, text: str) -> dict[str, str | float] | None:
        if len(text.strip()) < 12:
            return None
        vector = self._encode([self._segment(text)])[0]
        scores = {
            category: float((vector * prototype).sum().item())
            for category, prototype in self._prototypes.items()
        }
        return select_category(scores)


@lru_cache(maxsize=1)
def get_classifier() -> PhoBertCategoryClassifier:
    return PhoBertCategoryClassifier()
