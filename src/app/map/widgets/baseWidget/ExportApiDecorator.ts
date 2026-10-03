import BaseWidget from './baseWidget';
import { BaseWidgetOptions } from './baseWidgetTypes';

export default function ExportApi<MapWidget extends BaseWidget<BaseWidgetOptions>>() {
  return (Value: any, Context: ClassMethodDecoratorContext<MapWidget>) => {
    Context.addInitializer(function () {
      const Class = this as BaseWidget<BaseWidgetOptions>;
      Class.ApiExport.push(Context.name.toString());
    });
  };
}
