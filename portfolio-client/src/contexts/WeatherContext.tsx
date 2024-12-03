import React, { createContext, useState, useContext } from "react";

export interface WeatherParams {
  latitude: string;
  longitude: string;
  weather: string[];
  isSubmitted: boolean;
}

interface WeatherContextType {
  params: WeatherParams;
  updateParams: (newParams: Partial<WeatherParams>) => void;
}

const defaultParams: WeatherParams = {
  latitude: "55.3959",
  longitude: "10.3883",
  weather: ["temperature_2m"],
  isSubmitted: false,
};

const WeatherContext = createContext<WeatherContextType | undefined>(undefined);

export function WeatherProvider({ children }: { children: React.ReactNode }) {
  const [params, setParams] = useState<WeatherParams>(defaultParams);

  const updateParams = (newParams: Partial<WeatherParams>) => {
    setParams((prev) => ({ ...prev, ...newParams }));
  };

  return (
    <WeatherContext.Provider value={{ params, updateParams }}>
      {children}
    </WeatherContext.Provider>
  );
}

export const useWeather = () => {
  const context = useContext(WeatherContext);
  if (!context)
    throw new Error("useWeather must be used within WeatherProvider");
  return context;
};
