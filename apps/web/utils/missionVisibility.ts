export function isRecentMissionEnd(endedTurn:number|null|undefined,currentTurn:number){
 return endedTurn!=null&&currentTurn>=endedTurn&&currentTurn<=endedTurn+1
}
