import LineChart from "./LineChart";
import { useEffect, useState } from "react";
import { useWeather, WeatherParams } from "../contexts/WeatherContext";
import { DataSet } from "../types";
import { io } from "socket.io-client";

interface ChartElementProps {
  width: string;
}

const socket = io("http://localhost:3000");

const ChartElement: React.FC<ChartElementProps> = ({ width }) => {
  const [data, setData] = useState<DataSet[] | null>(null);
  const { params } = useWeather();

  useEffect(() => {
    const fetchNewData = () => {
      console.log("Fetching new data");
      fetchWeatherData(params).then(setData).catch(console.error);
    };

    // Debug socket connection
    socket.on("connect", () => {
      console.log("Socket connected");
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected");
    });

    socket.on("NewDataAvailable", fetchNewData);

    if (params.isSubmitted) {
      console.log("Trying to fetch data");
      fetchWeatherData(params).then(setData).catch(console.error);
    }

    return () => {
      socket.off("NewDataAvailable", fetchNewData);
    };
  }, [params]); // Re-fetch when params change

  console.log("Running ChartElement");

  if (!data) {
    console.log("Data not ready");

    return <div>Loading...</div>;
  }

  if (data.length < 1) {
    return <div>No data...</div>;
  }
  console.log("Returning LineChart");

  return <LineChart data={data} width={width} />;
};

export default ChartElement;

async function fetchWeatherData(params: WeatherParams): Promise<DataSet[]> {
  try {
    const searchParams = new URLSearchParams(
      Object.entries(params).reduce(
        (acc, [key, value]) => ({ ...acc, [key]: String(value) }),
        {}
      )
    );

    const response = await fetch(
      `http://localhost:3000/weather?${searchParams}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response}`);
    }

    const data: DataSet[] = await response.json();

    return data;
  } catch (error) {
    console.error("Error fetching weather data:", error);
    throw error;
  }
}
