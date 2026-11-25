import rules from '../../../packages/rules/operations.json' with {type:'json'}

export function missionFitWeights(type:string|undefined){
 return Object.entries(rules.templates.find(template=>template.type===type)?.weights??{})
  .filter((entry):entry is [string,number]=>typeof entry[1]==='number')
  .sort((a,b)=>b[1]-a[1])
}

export function missionFitScore(weights:[string,number][],attributes:Record<string,number>|undefined){
 return Math.round(weights.reduce((score,[attribute,weight])=>score+(attributes?.[attribute]??0)*weight,0))
}
