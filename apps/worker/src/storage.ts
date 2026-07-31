import type { AppSettings, ReleaseTrack, ReviewStatus } from "@ragectrl/shared"; import type { Env, TokenRecord } from "./types";
const KEYS={token:"auth:token",pending:"releases:pending",lastScan:"scan:last",settings:"settings"};
export const storage={
 getToken:(env:Env)=>env.APP_KV.get<TokenRecord>(KEYS.token,"json"), setToken:(env:Env,value:TokenRecord)=>env.APP_KV.put(KEYS.token,JSON.stringify(value)), clearToken:(env:Env)=>env.APP_KV.delete(KEYS.token),
 getPending:async(env:Env)=>(await env.APP_KV.get<ReleaseTrack[]>(KEYS.pending,"json"))??[], setPending:(env:Env,value:ReleaseTrack[])=>env.APP_KV.put(KEYS.pending,JSON.stringify(value)),
 getLastScan:(env:Env)=>env.APP_KV.get(KEYS.lastScan), setLastScan:(env:Env,value:string)=>env.APP_KV.put(KEYS.lastScan,value),
 getSettings:async(env:Env):Promise<AppSettings>=>(await env.APP_KV.get<AppSettings>(KEYS.settings,"json"))??{playlistId:env.SPOTIFY_PLAYLIST_ID,orderingMode:"newest",primaryArtistOnly:false}, setSettings:(env:Env,v:AppSettings)=>env.APP_KV.put(KEYS.settings,JSON.stringify(v)),
 reviewed:async(env:Env,id:string)=>Boolean(await env.APP_KV.get(`review:${id}`)), markReviewed:(env:Env,ids:string[],status:ReviewStatus)=>Promise.all(ids.map(id=>env.APP_KV.put(`review:${id}`,status))),
};
