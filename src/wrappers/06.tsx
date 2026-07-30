import { RecipeFeed, ItemList } from "../../exercises/06-memoization/exercise.tsx";

const recipes = [
  { id: "1", title: "Pasta Carbonara", durationMinutes: 30, cuisine: "Italian", isFeatured: true },
  { id: "2", title: "Sushi Roll", durationMinutes: 90, cuisine: "Japanese", isFeatured: false },
  { id: "3", title: "Fish Tacos", durationMinutes: 20, cuisine: "Mexican", isFeatured: false },
];

export default function Wrapper() {
  return (
    <>
      <h2>A: Recipe Feed (Problems 1–4)</h2>
      <RecipeFeed recipes={recipes} displayMode="card" isExpanded={true} />
      <h2>B: Item List (Problems 5–6)</h2>
      <ItemList />
    </>
  );
}
