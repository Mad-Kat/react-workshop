import { RecipeFeed, ItemList } from "../../exercises/07-memoization/solution.tsx";

const recipes = [
  { id: "1", title: "Pasta Carbonara", durationMinutes: 30, cuisine: "Italian", isFeatured: true },
  { id: "2", title: "Sushi Roll", durationMinutes: 90, cuisine: "Japanese", isFeatured: false },
  { id: "3", title: "Fish Tacos", durationMinutes: 20, cuisine: "Mexican", isFeatured: false },
];

export default function Wrapper() {
  return (
    <>
      <h2>Part A: Recipe Feed (Problems 1–4)</h2>
      <RecipeFeed recipes={recipes} displayMode="card" isExpanded={true} />
      <h2>Part B: Item List (Problem 5)</h2>
      <ItemList />
    </>
  );
}
