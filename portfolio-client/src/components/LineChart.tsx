import { useEffect, useRef } from "react";
import { Chart } from "chart.js/auto";
import { DateTime } from "luxon";
import { DataSet } from "../types";
import { useWeather } from "../contexts/WeatherContext";

interface LineChartProps {
  width: string;
  data: DataSet[];
}

const LineChart: React.FC<LineChartProps> = ({ data, width }) => {
  const chartRef = useRef<Chart | null>(null);
  const params = useWeather().params;

  Chart.defaults.color = "#cdd6f4";

  const formatTitle = (): string => {
    return `Weather updated at ${DateTime.now()
      .setLocale("da")
      .toLocaleString(DateTime.TIME_SIMPLE)}`;
  };

  const formatLabel = (hourlyParam: string[]): string => {
    const cleanArray = hourlyParam.map((param) => {
      const cleanParameter = param.replace(/_/g, " ").replace("2m", "").trim();
      return cleanParameter.charAt(0).toUpperCase() + cleanParameter.slice(1);
    });

    return cleanArray.join(", ");
  };

  const createChart = (data: DataSet[]) => {
    console.log(data);

    const ctx: HTMLCanvasElement = document.getElementById(
      "graph"
    ) as HTMLCanvasElement;
    if (ctx) {
      chartRef.current = new Chart(ctx, {
        type: "line",
        data: {
          labels: data[0].dataset.map((datapoint) => {
            const dateTime = DateTime.fromISO(datapoint.key);

            return dateTime
              .setLocale("da")
              .toLocaleString(DateTime.TIME_SIMPLE);
          }),
          datasets: data.map((ds) => {
            return {
              label: formatLabel([ds.param]),
              data: ds.dataset.map((dataPoint) => dataPoint.value),
              cubicInterpolationMode: "monotone",
            };
          }),
        },
        options: {
          responsive: true,
          plugins: {
            title: {
              display: true,
              text: formatTitle(),
            },
          },
          scales: {
            x: {
              display: true,
              title: {
                display: true,
                text: "Time",
              },
            },
            y: {
              display: true,
              title: {
                display: true,
                text: formatLabel(params.weather),
              },
            },
          },
        },
      });
    }
  };

  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.destroy();
    }
    const processedData: DataSet[] = data.reduce(
      (acc: DataSet[], dataset: DataSet) => {
        if (params.weather.includes(dataset.param)) {
          acc.push(dataset);
        }
        return acc;
      },
      []
    );

    createChart(processedData);

    // Why is the next part necessary?
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [data]);

  return (
    <div style={{ width: width }}>
      <canvas id="graph"></canvas>
    </div>
  );
};

export default LineChart;
