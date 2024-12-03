import "./App.css";
import Chart from "./components/ChartElement";
import WeatherSettings from "./components/WeatherSettings";
import { WeatherProvider } from "./contexts/WeatherContext";

function App() {
  return (
    <WeatherProvider>
      <WeatherSettings />
      <Chart width="800px" />
    </WeatherProvider>
  );
}

export default App;
