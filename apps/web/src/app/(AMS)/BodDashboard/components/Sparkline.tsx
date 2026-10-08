interface SparklineProps {
  data: number[];
}


export default function Sparkline({
  data,
}: SparklineProps) {

  if (
    !data ||
    data.length < 2
  ) {
    return (
      <div className="h-8" />
    );
  }


  const width =
    120;

  const height =
    32;


  const max =
    Math.max(
      ...data
    );


  const min =
    Math.min(
      ...data
    );


  const range =
    max - min || 1;


  const points =
    data
      .map(
        (
          value,
          index
        ) => {

          const x =
            (
              index /
              (
                data.length -
                1
              )
            ) *
            width;


          const y =
            height -
            (
              (
                value -
                min
              ) /
              range
            ) *
            height;


          return `${x},${y}`;
        }
      )
      .join(" ");


  return (
    <svg
      viewBox={
        `0 0 ${width} ${height}`
      }
      preserveAspectRatio="none"
      className="
        h-8
        w-28
        overflow-visible
      "
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}