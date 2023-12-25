import {NS} from '@ns'

export const AnsiColor = {
    RED: "\u001b[31m",
    RESET: "\u001b[0m",
};

export function error(ns: NS, msg: string) {
    log(ns, msg, AnsiColor.RED);
}

export function log(ns: NS, msg: string, colour: string | undefined = undefined) {
//    const date = new Date(Date.now()).toISOString();
    const prefix = colour === undefined ? "" : colour;
    const suffix = colour === undefined ? "" : AnsiColor.RESET;
    ns.tprintf(`${prefix}${ns.getScriptName()}: ${msg}${suffix}`);
}
