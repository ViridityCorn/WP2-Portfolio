export interface DataSet {
  param: string;
  dataset: DataPoint[];
}

export interface DataPoint {
  key: string;
  value: number;
}
