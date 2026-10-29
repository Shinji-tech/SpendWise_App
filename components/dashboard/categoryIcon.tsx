import type { TransactionCategory } from "@/lib/data";
import { BagIcon, BoltIcon, CarIcon, CoffeeIcon, DotsIcon, HomeIcon, IncomeIcon } from "../app-icons";

export function CategoryIcon({ category, className }: { category: TransactionCategory; className?: string }) {
  switch (category) {
    case "food":
      return <CoffeeIcon className={className} />;
    case "shopping":
      return <BagIcon className={className} />;
    case "transport":
      return <CarIcon className={className} />;
    case "housing":
      return <HomeIcon className={className} />;
    case "utilities":
      return <BoltIcon className={className} />;
    case "income":
      return <IncomeIcon className={className} />;
    default:
      return <DotsIcon className={className} />;
  }
}
