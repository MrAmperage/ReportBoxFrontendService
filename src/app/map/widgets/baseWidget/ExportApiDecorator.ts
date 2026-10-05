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

export function GetExportApiMethods(Target: object): readonly (string | symbol)[] {
  return (Target as any)[ApiExportKey] ?? [];
}
