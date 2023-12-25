import { WorkType } from '/lib/worktype'

export type Allocation = {
    id: string
    workType: WorkType
    target: string
    threads: number
    completionTimeMs: number
    additionalTimeMs: number | undefined
}

