import React from "react";

type Props = {
  title: string;
  objetivo?: string | null;
  className?: string;
  titleClassName?: string;
};

export default function LawSummary({ title, objetivo, className = "", titleClassName = "" }: Props) {
  return (
    <div className={"flex flex-col justify-center " + className}>
      <div className={(titleClassName ? titleClassName + " " : "") + "font-medium text-base"} style={{ lineHeight: 1.1 }}>
        {title}
      </div>
      {objetivo ? (
        <p
          className="text-[0.8125rem] text-muted-foreground break-words leading-tight mt-0.5"
          style={{
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {objetivo}
        </p>
      ) : null}
    </div>
  );
}
