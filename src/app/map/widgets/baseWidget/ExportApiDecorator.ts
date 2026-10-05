import BaseWidget from './baseWidget';
import { BaseWidgetOptions } from './baseWidgetTypes';

const ApiExportKey = Symbol('ApiExport');

export default function ExportApi() {
  return (Target: object, PropertyKey: string | symbol, _Descriptor: PropertyDescriptor): void => {
    let ApiExport: (string | symbol)[];

    if (Object.prototype.hasOwnProperty.call(Target, ApiExportKey)) {
      ApiExport = (Target as any)[ApiExportKey];
    } else {
      ApiExport = [...((Target as any)[ApiExportKey] ?? [])];

      Object.defineProperty(Target, ApiExportKey, {
        value: ApiExport,
        enumerable: false,
        configurable: false,
        writable: false,
      });
    }

    if (!ApiExport.includes(PropertyKey)) {
      ApiExport.push(PropertyKey);
    }
  };
}

export function InitExportApi<OptionsType extends object>(Widget: { Options: OptionsType }): void {
  const ApiExport: readonly (string | symbol)[] = (Widget as any)[ApiExportKey] ?? [];
  const Api: Record<string, (...Args: any[]) => any> = {};
  for (const MethodName of ApiExport) {
    const Method = (Widget as any)[MethodName];

    if (typeof Method !== 'function') {
      continue;
    }

    Api[MethodName.toString()] = Method.bind(Widget);
  }

  (Widget.Options as any).Api = Api;
}
