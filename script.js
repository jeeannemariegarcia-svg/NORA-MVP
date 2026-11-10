/* NORA student location finder — SIMULATED browser-local data.
   Building images are references only; no photographed washroom is claimed. */
const defaultBaskets=[
 {id:1,name:"Stan Grad Centre",products:"Pads and tampons",stock:32,capacity:50},
 {id:2,name:"Senator Burns Building",products:"Pads and tampons",stock:8,capacity:50}
];
const locationList=document.getElementById("location-list");
const searchInput=document.getElementById("location-search");
const knownPhotos={
 1:{src:"https://upload.wikimedia.org/wikipedia/commons/6/6c/SAIT_-_Stan_Grad_Centre.jpg",
    alt:"Interior atrium at SAIT's Stan Grad Centre; not a washroom",
    credit:"Photo: Elpoca / Wikimedia Commons · CC BY-SA 4.0",
    url:"https://commons.wikimedia.org/wiki/File:SAIT_-_Stan_Grad_Centre.jpg"},
 2:null
};
let selectedLocationId=null;
function getBaskets(){
  try {
    const parsed=JSON.parse(localStorage.getItem("noraBaskets")||"null");
    if(Array.isArray(parsed))return parsed.filter(b=>b && b.active!==false);
  }catch(error){console.warn("NORA demo locations unavailable",error);}
  return defaultBaskets;
}
function statusOf(basket){
  const stock=Math.max(0,Number(basket.stock)||0);
  if(stock===0)return "Out of stock (simulation)";
  if(stock<=(Number.isInteger(basket.threshold)?basket.threshold:10))return "Low stock (simulation)";
  return "Available (simulation)";
}
function el(tag,cls,text){
  const node=document.createElement(tag);
  if(cls)node.className=cls;
  if(text!==undefined)node.textContent=text;
  return node;
}
function selectLocation(id,focusMap=false){
  selectedLocationId=id;
  displayLocations(searchInput?.value||"");
  if(focusMap)document.dispatchEvent(new CustomEvent("nora-location-selected",{detail:{id}}));
}
function buildCard(basket){
  const expanded=String(basket.id)===String(selectedLocationId);
  const card=el("article","student-location-card"+(expanded?" is-open":""));
  const photo=knownPhotos[basket.id];
  const visual=el("div","student-location-visual");
  if(photo){
    const img=el("img","student-location-photo");
    img.src=photo.src;img.alt=photo.alt;img.loading="lazy";
    visual.append(img);
  }else{
    visual.classList.add("student-photo-pending");
    const symbol=el("span","student-photo-symbol","⌂");
    symbol.setAttribute("aria-hidden","true");
    visual.append(symbol,el("span","student-photo-label","Building photo coming soon"));
  }
  visual.append(el("span","student-building-label","PROPOSED LOCATION"));
  const inside=el("div","student-location-content");
  const row=el("div","student-location-top");
  row.append(el("h3","",basket.name||"Unnamed location"),el("span","student-stock-tag",statusOf(basket)));
  inside.append(row,el("p","student-location-subtitle","Proposed NORA basket · Pads and tampons"));
  const toggle=el("button","student-location-toggle",expanded?"Hide building details":"View building details");
  toggle.type="button";toggle.setAttribute("aria-expanded",String(expanded));
  toggle.addEventListener("click",()=>selectLocation(expanded?null:basket.id,true));
  inside.append(toggle);
  if(expanded){
    const detail=el("div","student-location-detail");
    if(photo){
      const credit=el("p","student-photo-credit");
      const link=el("a","",photo.credit);
      link.href=photo.url;link.target="_blank";link.rel="noopener noreferrer";
      credit.append(link);detail.append(credit);
    }else detail.append(el("p","student-photo-credit","No approved building or washroom photo has been uploaded for this location."));
    const metadata=el("div","student-location-metadata");
    const status=el("div");status.append(el("strong","", "Simulated stock"),el("span","",Math.max(0,Number(basket.stock)||0)+" / "+Math.max(0,Number(basket.capacity)||0)+" products"));
    const type=el("div");type.append(el("strong","", "Illustrative products"),el("span","",basket.products||"Pads and tampons"));
    metadata.append(status,type);detail.append(metadata);
    detail.append(el("p","student-location-caution","Exact washroom, access details and basket installation have not been confirmed. The photo is a building reference, not proof of product availability."));
    const mapButton=el("button","student-map-focus","Focus this building on the map");
    mapButton.type="button";
    mapButton.addEventListener("click",()=>document.dispatchEvent(new CustomEvent("nora-location-selected",{detail:{id:basket.id,scroll:true}})));
    detail.append(mapButton);
    inside.append(detail);
  }
  card.append(visual,inside);
  return card;
}
function displayLocations(searchTerm=""){
  if(!locationList)return;
  const term=String(searchTerm).toLowerCase().trim();
  const matching=getBaskets().filter(b=>String(b.name||"").toLowerCase().includes(term));
  locationList.replaceChildren(...matching.map(buildCard));
  if(!matching.length)locationList.append(el("p","student-no-locations","No matching proposed locations. Try another building name."));
}
searchInput?.addEventListener("input",()=>displayLocations(searchInput.value));
document.addEventListener("nora-map-location-selected",event=>{
  const id=event.detail?.id;
  const basket=getBaskets().find(b=>String(b.id)===String(id));
  if(!basket)return;
  if(searchInput && !basket.name.toLowerCase().includes(searchInput.value.toLowerCase().trim()))searchInput.value="";
  selectedLocationId=basket.id;displayLocations(searchInput?.value||"");
  locationList?.querySelector(".is-open")?.scrollIntoView({behavior:"smooth",block:"nearest"});
});
window.addEventListener("pageshow",()=>displayLocations(searchInput?.value||""));
window.addEventListener("storage",event=>{
 if(event.key==="noraBaskets")displayLocations(searchInput?.value||"");
});
displayLocations();
