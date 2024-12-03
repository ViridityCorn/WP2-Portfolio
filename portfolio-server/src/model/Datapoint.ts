import mongoose from 'mongoose';
const {Schema, model} = mongoose;

const DatapointSchema = new Schema({
    datetime: String,
    latitude: String,
    longitude: String,
    parameter: String,
    value: Number
})

const Datapoint = model('Datapoint', DatapointSchema);
export default Datapoint;
