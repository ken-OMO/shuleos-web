"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) { useEffect(() => { /* Error reporting boundary will be configured in a later phase. */ }, []); return <main className="grid min-h-screen place-items-center p-6"><div role="alert" className="max-w-lg text-center"><span className="mx-auto grid size-14 place-items-center rounded-2xl bg-destructive/10 text-destructive"><AlertTriangle /></span><h1 className="mt-7 text-3xl font-bold">We couldn’t open this page.</h1><p className="mt-3 text-muted-foreground">Your data has not been changed. Try the request again; technical details are intentionally hidden.</p><Button className="mt-7" onClick={reset}><RotateCcw />Try again</Button></div></main>; }
