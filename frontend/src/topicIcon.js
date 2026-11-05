export const topicIcon = (topic) => {
  const name = topic.toLowerCase();
  if (name.includes("array")) return "▦";
  if (name.includes("string")) return "Aa";
  if (name.includes("hash") || name.includes("map")) return "#";
  if (name.includes("math")) return "∑";
  if (name.includes("depth-first") || name.includes("dfs")) return "↘";
  if (name.includes("sorting")) return "⇅";
  if (name.includes("dynamic programming")) return "▤";
  if (name.includes("binary search")) return "⌕";
  if (name.includes("tree")) return "⑂";
  if (name.includes("graph")) return "◉";
  if (name.includes("linked list")) return "⇢";
  if (name.includes("heap")) return "△";
  if (name.includes("greedy")) return "♟";
  return "✦";
};
