import { NS } from '@ns'

export class Stopwatch {
    private ns: NS
    private started = new Date().getTime()

    constructor(ns: NS) {
        this.ns = ns
    }

    elapsedMs(): number {
        return new Date().getTime() - this.started
    }

    elapsedFormatted(): string {
        return this.ns.tFormat(this.elapsedMs())
    }
}
