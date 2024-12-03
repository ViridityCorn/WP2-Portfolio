import express, { Express, Request, Response } from "express";
import { createServer } from "node:http";
import cors from "cors";
import { DataSet, DataPoint as DataPointType } from "./types";
import Datapoint from "./model/Datapoint";
import mongoose from "mongoose";
import { schedule } from "node-cron";
import { Server } from "socket.io";

// DB
mongoose.connect("mongodb://localhost:27017/weather");
deleteAllDatapoints();
// CORS

const corsOptions = {
  origin: "http://localhost:5173",
  methods: ["GET", "POST"],
  credentials: true,
};

// Express
const app: Express = express();
const port = 3000;
app.use(express.json());
app.use(cors(corsOptions));
// Socket.io
const server = createServer(app);
const io = new Server(server, {
  cors: corsOptions,
});
io.on("connection", (socket) => {
  console.log(
    `Client connected - ID: ${socket.id} | IP: ${
      socket.handshake.address
    } | Time: ${new Date().toISOString()}`
  );

  socket.on("disconnect", () => {
    console.log(`Client disconnected - ID: ${socket.id}`);
  });
});
// Weather
const url = "https://api.open-meteo.com/v1/forecast";
const allowedWeatherParameters = [
  "temperature_2m",
  "relative_humidity_2m",
  "rain",
  "snowfall",
];
const params: { [key: string]: string } = {};
setDefaultParams("auto", "best_match");
let running: boolean = false;

app.get("/weather", async (req: Request, res: Response) => {
  if (!running) {
    running = true;
    startNewRequest(req, res);
  } else {
    returnAllData(res);
  }
});

server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

// Initiate a new request by setting params, fetching data, starting cronjob, and returning data to client
async function startNewRequest(req: Request, res: Response) {
  const param_latitude = req.query.latitude as string;
  if (param_latitude) {
    params["latitude"] = param_latitude;
  }
  const param_longitude = req.query.longitude as string;
  if (param_longitude) {
    params["longitude"] = param_longitude;
  }
  if (!param_latitude || !param_longitude) {
    res.status(500).json({ error: "Latitude and longitude are required" });
    return;
  }
  params["weather"] = allowedWeatherParameters.join(",");

  if (Object.keys(params).length === 0) {
    res.status(500).json({ error: "No parameters provided" });
    return;
  }
  await deleteAllDatapoints();
  await fetchNewData();
  await startFetchingCronjob();
  await returnAllData(res);
}
// Fetches data from API and puts it into the database
async function fetchNewData() {
  const response = await fetch(
    url +
      "?" +
      new URLSearchParams({
        latitude: params.latitude,
        longitude: params.longitude,
        timezone: "auto",
        current: params.weather,
      })
  )
    .then((response) => {
      if (!response.ok) {
        // Data could not be fetched
      }
      return response.json();
    })
    .then((data) => {
      const time = data.current.time;

      allowedWeatherParameters.forEach((element) => {
        Datapoint.create(
          new Datapoint({
            datetime: time,
            latitude: params.latitude,
            longitude: params.longitude,
            parameter: element,
            value: data.current[element],
          })
        );
      });
    });
}
// Gets amount of minutes until next "whole" 15-minute mark
function getMinutesUntilNext15(): number {
  const now = new Date();
  const minutes = now.getMinutes();
  return 15 - (minutes % 15);
}
// Starts the job of fetching weatherdata every 15 minutes starting at next possible "whole" 15 minutes
function startFetchingCronjob() {
  const minutesToStart = getMinutesUntilNext15();
  console.log(`Starting fetching-cronjob in ${minutesToStart} minutes`);

  const cronjob = schedule("2,17,32,47 * * * *", async () => {
    console.log("Fetching new data");
    await fetchNewData();
    alertClient();
  });
}

// Fetch data from DB and return it to client
async function returnAllData(res: Response) {
  const dbData = await Datapoint.find({}).sort("datetime");
  let weatherData: DataSet[] = [];

  // Group data by parameter
  const groupedData = dbData.reduce<{ [key: string]: DataPointType[] }>(
    (acc: { [key: string]: DataPointType[] }, item: any) => {
      if (!acc[item.parameter]) {
        acc[item.parameter] = [];
      }
      acc[item.parameter].push({
        key: item.datetime,
        value: item.value,
      });
      return acc;
    },
    {}
  );

  Object.entries(groupedData).forEach(([param, dataset]) => {
    weatherData.push({
      param,
      dataset,
    });
  });

  res.json(weatherData);
}

function alertClient() {
  io.emit("NewDataAvailable");
}

function setDefaultParams(timeszone: string, models: string): void {
  (params.timezone = timeszone), (params.models = models);
}

async function deleteAllDatapoints() {
  try {
    await Datapoint.deleteMany({});
    console.log("Successfully deleted all datapoints");
  } catch (error) {
    console.error(
      "Failed to delete datapoints:",
      error instanceof Error ? error.message : "Unknown error"
    );
  }
}

export default app;

/*
const params: { [key: string]: string } = {};

const param_latitude = req.query.latitude as string;
  if (param_latitude) {
    params["latitude"] = param_latitude;
  }
  const param_longitude = req.query.longitude as string;
  if (param_longitude) {
    params["longitude"] = param_longitude;
  }
  if (!param_latitude || !param_longitude) {
    res.status(500).json({ error: "Latitude and longitude are required" });
    return;
  }
  params["current"] = allowedWeatherParameters.toString();

  if (Object.keys(params).length === 0) {
    res.status(500).json({ error: "No parameters provided" });
    return;
  }

  let weatherData: DataSet[] = [];
  // Check and/or update database for data
  const { isComplete, existingData } = await checkDatabase(params);
  if (!isComplete) {
    const responses = await fetchWeatherApi(url, params);

    responses.forEach((response) => {
      const utcOffsetSeconds = response.utcOffsetSeconds();

      const weatherResponse = response.minutely15();

      if (!weatherResponse) {
        res.status(500).json({ error: "Data is not available" });
        return;
      }

      const times = range(
        Number(weatherResponse.time()),
        Number(weatherResponse.timeEnd()),
        weatherResponse.interval()
      ).map((t) => new Date((t + utcOffsetSeconds) * 1000));

      // Format fetched data into datapoints for the DB
      const weatherValuesArray = params.weather.split(",");
      for (let i = 0; i < weatherResponse.variablesLength(); i++) {
        times.map((time, index) =>
          Datapoint.create(
            new Datapoint({
              datetime: time.toISOString(),
              latitude: params.latitude,
              longitude: params.longitude,
              parameter: weatherValuesArray[i],
              value: weatherResponse.variables(i)!.valuesArray()![index], // This will properly not work correctly
            })
          )
        );

        weatherData.push({
          param: weatherValuesArray[i],
          dataset: times.map((time, index) => ({
            key: time.toISOString(),
            value: weatherResponse.variables(i)!.valuesArray()![index],
          })),
        });
      }

      res.json(weatherData);
    });
  } else if (existingData != null) {
    // Group data by parameter
    const groupedData = existingData.reduce(
      (acc: { [key: string]: DataPointType[] }, item) => {
        if (!acc[item.parameter]) {
          acc[item.parameter] = [];
        }
        acc[item.parameter].push({
          key: item.datetime,
          value: item.value,
        });
        return acc;
      },
      {}
    );

    // Convert grouped data to expected format
    Object.entries(groupedData).forEach(([param, dataset]) => {
      weatherData.push({
        param,
        dataset,
      });
    });

    res.json(weatherData);
  }
*/

/*
// Checks if data is in database and returns it
async function checkDatabase(
  params: any
): Promise<{ isComplete: boolean; existingData?: any[] }> {
  try {
    const startDate = new Date();
    startDate.setMinutes(0, 0, 0);

    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + parseInt(params.forecast_days));

    const minutelyArray = params.weather.includes(",")
      ? params.weather.split(",")
      : [params.weather];

    const existingData = await Datapoint.find({
      datetime: {
        $gte: startDate.toISOString(),
        $lte: endDate.toISOString(),
      },
      latitude: params.latitude,
      longitude: params.longitude,
      parameter: { $in: minutelyArray },
    }).sort("datetime");

    const hoursInRange =
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
    const expectedDatapoints = hoursInRange * minutelyArray.length;

    const isComplete = existingData.length >= expectedDatapoints;

    console.log(`DB Data: \n ${existingData}`);

    return {
      isComplete,
      existingData:
        existingData.length >= expectedDatapoints ? existingData : undefined,
    };
  } catch (error) {
    console.error("Database check failed:", error);
    return { isComplete: false };
  }
}
*/
