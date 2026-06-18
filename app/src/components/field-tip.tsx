import { Tooltip } from "@/components/tooltip";

/** 字段旁的说明图标，点击/悬停显示解释内容 */
export function FieldTip({ tip, children }: { tip: string; children?: React.ReactNode }) {
  return (
    <Tooltip content={tip}>
      <span className="inline-flex items-center gap-1 cursor-help touch-manipulation select-none">
        {children}
        <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full border border-current text-[9px] text-text-muted leading-none shrink-0">
          i
        </span>
      </span>
    </Tooltip>
  );
}
