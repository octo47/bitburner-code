import { WorkType } from '/v2/lib/worktype'

export type Allocation = {
    id: string
    workType: WorkType
    target: string
    threads: number
    completionTimeMs: number
    additionalTimeMs: number | undefined
}

