import * as TooltipPrimitive from '@radix-ui/react-tooltip';

export default function Tooltip({
  content,
  children,
}: {
  content: string;
  children: React.ReactNode;
}) {
  return (
    <TooltipPrimitive.Provider delayDuration={250}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            sideOffset={8}
            className="z-[70] max-w-[280px] border border-forge-border bg-forge-surface2 px-3 py-2 text-[13px] text-forge-text shadow-xl"
          >
            {content}
            <TooltipPrimitive.Arrow className="fill-forge-surface2" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}

