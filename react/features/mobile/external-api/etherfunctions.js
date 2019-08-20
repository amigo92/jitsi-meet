/* eslint-disable require-jsdoc */
import { NativeModules, NativeEventEmitter } from "react-native";

export function externalApiEventEmitter() {
    return new NativeEventEmitter(NativeModules.ExternalAPI);
}
