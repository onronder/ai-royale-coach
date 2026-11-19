export const tag = '#UY02YVY9G';
export const cards = [3,4,4,5,3,2,6,5].map((elixirCost,i)=>({id:26000000+i,name:`Card ${i}`,level:15,maxLevel:16,elixirCost,iconUrls:{medium:''}}));
export function battle(time='20261119T120000.000Z', own=1, enemy=0): any {
  return {type:'PvP',gameMode:{name:'Ladder'},battleTime:time,
    team:[{tag,name:'Player',crowns:own,cards:structuredClone(cards),startingTrophies:6000,trophyChange:30}],
    opponent:[{tag:'#UQRCGQJR2',name:'Opponent',crowns:enemy,cards:structuredClone(cards),startingTrophies:6100}]};
}
