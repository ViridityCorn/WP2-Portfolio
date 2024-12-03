import { useWeather } from "../contexts/WeatherContext";
import styles from "./styles/WeatherSettings.module.css";
import { ChangeEventHandler, useState } from "react";

export default function WeatherSettings() {
  const { params, updateParams } = useWeather();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    // Get weather values as array since it's a multiple select
    const weatherValues = formData.getAll("weather");
    setIsSubmitted(true);
    updateParams({
      latitude: formData.get("latitude") as string,
      longitude: formData.get("longitude") as string,
      weather: weatherValues as string[],
      isSubmitted: true,
    });
  };
  const onWeatherChange: ChangeEventHandler<HTMLSelectElement> = (e) => {
    console.log("Parameter changed");

    const weatherValues = Array.from(
      e.target.selectedOptions,
      (option) => option.value
    );
    updateParams({
      weather: weatherValues as string[],
    });
  };

  return (
    <>
      <form className={styles.form} onSubmit={handleSubmit}>
        <label>
          Latitude
          <input
            type="text"
            name="latitude"
            defaultValue={params.latitude}
            disabled={isSubmitted}
            required
          />
        </label>
        <label>
          Longitude
          <input
            type="text"
            name="longitude"
            defaultValue={params.longitude}
            disabled={isSubmitted}
            required
          />
        </label>
        <label>
          Weather
          <select
            name="weather"
            id="weather"
            defaultValue={params.weather}
            onChange={onWeatherChange}
            multiple
          >
            <option value="temperature_2m">Temperature</option>
            <option value="relative_humidity_2m">Relative Humidity</option>
            <option value="rain">Rain</option>
            <option value="snowfall">Snow</option>
          </select>
        </label>
        <input type="submit" value="Start" disabled={isSubmitted} />
      </form>
    </>
  );
}
