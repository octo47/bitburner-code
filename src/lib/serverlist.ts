
import { NS } from '@ns'
import { ServerData } from "/lib/serverdata"

const STATE_FILE = "state.js"

export class ServerList {

    servers: ServerData[]

    constructor(servers: ServerData[]) {
        this.servers = servers
    }

    save(ns: NS): void {
        if (ns.fileExists(STATE_FILE)) {
            ns.rm(STATE_FILE)
        }
        const serialized = JSON.stringify(this.servers)
        ns.write(STATE_FILE, serialized, 'w')
    }

    filtered(predicate: (elem: ServerData) => boolean): ServerData[] {
        return this.servers.filter(predicate)
    }

    static load(ns: NS): ServerList {
        const stateFile = ns.read(STATE_FILE)
        const servers = JSON.parse(stateFile)
        return new ServerList(servers)
    }
}
