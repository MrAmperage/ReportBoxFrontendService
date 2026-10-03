const ApiExportKey = Symbol('ApiExport');

export default function ExportApi() {
  return (Target: object, PropertyKey: string | symbol, Descriptor: PropertyDescriptor): void => {
    let ApiExport: string[];

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

    const MethodName = PropertyKey.toString();

    if (!ApiExport.includes(MethodName)) {
      ApiExport.push(MethodName);
    }
  };
}

export function GetExportApi(Target: object): string[] {
  return (Target as any)[ApiExportKey] ?? [];
}
