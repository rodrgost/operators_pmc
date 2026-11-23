import {countries} from './index.ts';

export const intelligenceTopicLabels:Record<string,string>={
 stability:'Estabilidade',security:'Segurança',economy:'Economia',tension:'Tensão',difficulty:'Dificuldade',risk:'Risco',
};

export function analysisTitle(topic:string,targetType:string,targetId:string,contractTitle?:string|null){
 const name=targetType==='region'?countries.find(country=>country.id===targetId)?.name:contractTitle;
 const subject=intelligenceTopicLabels[topic]?.toLowerCase();
 return [subject?'Análise de '+subject:'Análise de inteligência',name??targetId].filter(Boolean).join(' · ');
}
