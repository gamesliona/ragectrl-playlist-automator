import type { OrderingMode, ReleaseTrack } from "@ragectrl/shared";
export const deduplicateTracks=(tracks:ReleaseTrack[])=>[...new Map(tracks.map(t=>[t.spotifyTrackId,t])).values()];
export const withinLookback=(track:ReleaseTrack,days:number,now=new Date())=>new Date(`${track.releaseDate}T00:00:00Z`).getTime()>=now.getTime()-days*86400000;
export const filterPrimary=(tracks:ReleaseTrack[],watchedIds:Set<string>)=>tracks.filter(t=>t.primaryArtistIds.some(id=>watchedIds.has(id)));
export function orderTracks(tracks:ReleaseTrack[],mode:OrderingMode,random:()=>number=Math.random):ReleaseTrack[]{const copy=[...tracks];if(mode==="newest")return copy.sort((a,b)=>b.releaseDate.localeCompare(a.releaseDate));if(mode==="oldest")return copy.sort((a,b)=>a.releaseDate.localeCompare(b.releaseDate));if(mode==="random"){for(let i=copy.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[copy[i],copy[j]]=[copy[j]!,copy[i]!]} }return copy}
export const missingTrackIds=(requested:string[],present:Set<string>)=>[...new Set(requested)].filter(id=>!present.has(id));
