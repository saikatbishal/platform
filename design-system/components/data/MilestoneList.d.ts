/** Achieved and locked milestones, one row each. */
export interface MilestoneStatus {
  id?: string;
  label: string;
  /** What is true right now, said plainly whether locked or not. */
  detail: string;
  achieved?: boolean;
}
export interface MilestoneListProps { milestones?: MilestoneStatus[] }
export declare function MilestoneList(props: MilestoneListProps): JSX.Element;
