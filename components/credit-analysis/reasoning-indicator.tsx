"use client";

import { useState, useEffect } from "react";
import { Bot, Brain } from "lucide-react";
import { useTranslations } from "next-intl";

export function ReasoningIndicator() {
	const t = useTranslations("creditAnalysis.chat");
	const [phase, setPhase] = useState(0);

	useEffect(() => {
		const timers = [
			setTimeout(() => setPhase(1), 4000),
			setTimeout(() => setPhase(2), 10000),
		];
		return () => timers.forEach(clearTimeout);
	}, []);

	const phaseText =
		phase === 0
			? t("reasoning")
			: phase === 1
				? t("reasoningDeep")
				: t("reasoningAlmost");

	return (
		<div className="flex gap-4 px-4 py-5">
			<div className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-foreground/5 text-foreground dark:bg-foreground/10">
				<Bot className="size-4" />
			</div>
			<div className="flex flex-col gap-1.5">
				<div className="flex items-center gap-2 py-2">
					<Brain className="size-4 animate-pulse text-primary" />
					<span className="text-sm font-medium text-primary">
						{phaseText}
					</span>
				</div>
				<div className="h-1 w-24 overflow-hidden rounded-full bg-muted">
					<div className="h-full w-full animate-pulse rounded-full bg-primary/50" />
				</div>
			</div>
		</div>
	);
}
