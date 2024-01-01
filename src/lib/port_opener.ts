import { NS, Server } from '@ns'


class OpenerProgram {
    name: string
    isOpen: (server: Server) => boolean
    opener: (hostname: string) => void

    constructor(
        name: string,  
        isOpen: (server: Server) => boolean, 
        opener: (hostname: string) => void  
    ) {
        this.name = name
        this.isOpen = isOpen
        this.opener = opener
    }
}


export class PortOpener {

    private available: OpenerProgram[] = [];
    private ns: NS
    
    constructor(ns: NS) {
    
        this.ns = ns
        
        const openers = [
            new OpenerProgram("BruteSSH.exe", (server: Server) => { return server.sshPortOpen }, (hostname: string) => { return ns.brutessh(hostname) }),
            new OpenerProgram("FTPCrack.exe", (server: Server) => { return server.ftpPortOpen }, (hostname: string) => { return ns.ftpcrack(hostname) }),
            new OpenerProgram("relaySMTP.exe", (server: Server) => { return server.smtpPortOpen }, (hostname: string) => { return ns.relaysmtp(hostname) }),
            new OpenerProgram("HTTPWorm.exe", (server: Server) => { return server.httpPortOpen }, (hostname: string) => { return ns.httpworm(hostname) }),
            new OpenerProgram("SQLInject.exe", (server: Server) => { return server.sqlPortOpen }, (hostname: string) => { return ns.sqlinject(hostname) }),
        ]
        
        openers.forEach((opener) => {
            if ( this.ns.fileExists(opener.name) ) {
                this.available.push(opener)
            }
        })
    }

    isOpen(server: Server): boolean {
        return server.numOpenPortsRequired == null ||
         (server.openPortCount != null && (server.numOpenPortsRequired - server.openPortCount) < 1)
    }

    status(server: Server, hackingSkill: number): string {
        if (server.hasAdminRights) {
            return "HACKED"
        }

        if (server.requiredHackingSkill ?? 0 > hackingSkill) {
            return `TOO WEAK ${server.requiredHackingSkill ?? 0}`
        }

        if (this.isOpen(server)) {
            return "OPEN"
        }
        const toOpen = server.numOpenPortsRequired ?? 0
        const alreadyOpen = server.openPortCount ?? 0

        if (toOpen - alreadyOpen === 0) {
            return "OPEN"
        }

        return `${toOpen - alreadyOpen} PORTS TO OPEN`
    }

    open(server: Server): boolean {
        if (this.isOpen(server)) {
            return true
        }
        if (!server.requiredHackingSkill) {
            return false
        }

        if (server.requiredHackingSkill > this.ns.getHackingLevel()) {
            return false
        }

        for (const idx in this.available) {
            const opener = this.available[idx]
            if (opener.isOpen(server)) {
                continue
            }
            opener.opener(server.hostname)
        }
        return this.isOpen(server)
    }

    nuke(server: Server): boolean {
        if (this.open(server)) {
            this.ns.nuke(server.hostname)
            return server.hasAdminRights
        }
        return false
    }

}