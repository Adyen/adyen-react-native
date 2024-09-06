import { NativeModule, NativeModules } from "react-native";
import { AddressLookup } from '../core/configurations/AddressLookup';
import { AdyenActionComponent } from "../core/AdyenNativeModules";
import { ModuleMock } from "./ModuleMock";

/** Describes Drop-in module. */

export interface DropInModule extends AdyenActionComponent, NativeModule, AddressLookup {
  /**
   * Provides return URL for current application.
   */
  getReturnURL: () => Promise<string>;
}

/** Drop-in is our pre-built UI solution for accepting payments. Drop-in shows all payment methods as a list and handles actions. */
export const AdyenDropIn: DropInModule = NativeModules.AdyenDropIn ?? ModuleMock;