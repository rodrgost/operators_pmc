export function scrollCampaignElement(element:HTMLElement|null|undefined,alignment:'start'|'center'|'nearest'='nearest'){
 const scroll=element?.closest<HTMLElement>('.campaign-scroll')
 if(!element||!scroll||!element.getClientRects().length)return
 const view=scroll.getBoundingClientRect()
 const target=element.getBoundingClientRect()
 const inset=8
 const available=view.height-inset*2
 const start=target.top-view.top-inset
 if(alignment==='nearest'&&start>=0&&target.bottom<=view.bottom-inset)return
 const offset=alignment==='center'&&target.height<available?start-(available-target.height)/2
  :alignment==='nearest'&&start>=0&&target.height<available?target.bottom-view.bottom+inset
  :start
 scroll.scrollBy({top:offset,behavior:'instant'})
}
