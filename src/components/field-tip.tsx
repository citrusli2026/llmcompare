import { Tooltip } from "@/components/tooltip";

/** 字段旁的说明图标，点击/悬停显示解释内容 */
export function FieldTip({ tip }: { tip: string }) {
  return (
    <Tooltip content={tip}>
      <span className="relative inline-flex items-center justify-center w-3.5 h-3.5 rounded-full border border-current text-[9px] text-text-muted cursor-help leading-none shrink-0 ml-1 select-none touch-manipulation before:absolute before:-inset-2 before:rounded-full">
        i
      </span>
    </Tooltip>
  );
}
