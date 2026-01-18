import type { QuoteExplanationNode } from "../lib/quoteApi";

type ExplanationTreeProps = {
  nodes: QuoteExplanationNode[];
};

export function ExplanationTree({ nodes }: ExplanationTreeProps) {
  if (!nodes.length) {
    return <p className="text-sm text-slate-500">No explanation data available.</p>;
  }
  return (
    <ul className="space-y-3">
      {nodes.map((node, index) => (
        <ExplanationTreeNode key={`${node.title}-${index}`} node={node} depth={0} />
      ))}
    </ul>
  );
}

function ExplanationTreeNode({
  node,
  depth,
}: {
  node: QuoteExplanationNode;
  depth: number;
}) {
  const hasChildren = node.children.length > 0;
  const formattedValue =
    node.value === null || node.value === undefined
      ? null
      : formatValue(node.value);
  return (
    <li className={`space-y-2 ${depth > 0 ? "border-l border-slate-700/40 pl-3" : ""}`}>
      <div className="flex items-center justify-between text-sm text-slate-200">
        <span className="font-semibold text-slate-100">{node.title}</span>
        {formattedValue ? (
          <span className="text-xs text-slate-400">{formattedValue}</span>
        ) : null}
      </div>
      {hasChildren && (
        <ul className="space-y-2">
          {node.children.map((child, index) => (
            <ExplanationTreeNode
              key={`${child.title}-${depth}-${index}`}
              node={child}
              depth={depth + 1}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

function formatValue(value: string | number | boolean) {
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  if (typeof value === "number") {
    return Number.isInteger(value) ? value.toString() : value.toFixed(2);
  }
  return value;
}
