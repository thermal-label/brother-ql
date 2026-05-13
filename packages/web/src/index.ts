export { DEFAULT_FILTERS, WebBrotherQLPrinter, type RequestOptions } from './printer.js';

/* eslint-disable @typescript-eslint/no-deprecated -- legacy factories re-exported during plan-10 transition */
export {
  fromUSBDevice,
  fromUSBDeviceAll,
  requestPrinter,
  requestPrintersUsbLegacy,
} from './printer.js';
/* eslint-enable @typescript-eslint/no-deprecated */

export { devicesForTransport, requestPrinters } from './request-printers.js';

export type { ConnectOptions, PrinterAdapterMap } from '@thermal-label/contracts';
export { DeviceIdentificationRequiredError } from '@thermal-label/contracts';
