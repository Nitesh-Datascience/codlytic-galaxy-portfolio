const SUPABASE_URL=process.env.SUPABASE_URL,KEY=process.env.SUPABASE_PUBLISHABLE_KEY;
function cookie(req,n){const v=(req.headers.cookie||"").split(";").map(x=>x.trim()).find(x=>x.startsWith(n+"="));return v?decodeURIComponent(v.slice(n.length+1)):""}
function send(res,s,d){res.statusCode=s;res.setHeader("Content-Type","application/json");res.setHeader("Cache-Control","no-store");res.end(JSON.stringify(d))}
async function query(path,token=""){const r=await fetch(SUPABASE_URL+path,{headers:{apikey:KEY,...(token?{Authorization:"Bearer "+token}:{})}});const d=await r.json().catch(()=>[]);if(!r.ok)throw new Error("Could not verify this PDF access.");return d}
export default async function handler(req,res){
 if(req.method!=="GET")return send(res,405,{error:"Method not allowed."});
 try{
  const id=String(req.query?.id||"");if(!/^[0-9a-f-]{36}$/i.test(id))return send(res,400,{error:"Invalid note."});
  const token=cookie(req,"codlytic_access");let note=null,allowed=false;
  if(token){try{await query("/auth/v1/user",token);const a=await fetch(SUPABASE_URL+"/rest/v1/rpc/is_admin",{method:"POST",headers:{apikey:KEY,Authorization:"Bearer "+token,"Content-Type":"application/json"},body:"{}"});allowed=a.ok&&await a.json()===true;if(allowed){const rows=await query("/rest/v1/codlytic_notes?select=attachment_path,status&id=eq."+id,token);note=rows[0]}}catch{}}
  if(!note){const rows=await query("/rest/v1/codlytic_notes?select=attachment_path,status&id=eq."+id+"&status=eq.published");note=rows[0]}
  if(!note||!note.attachment_path||(!allowed&&note.status!=="published"))return send(res,404,{error:"PDF not found or not published."});
  const signed=await fetch(SUPABASE_URL+"/storage/v1/object/sign/codlytic-note-pdfs/"+encodeURIComponent(note.attachment_path),{method:"POST",headers:{apikey:KEY,...(allowed&&token?{Authorization:"Bearer "+token}:{}),"Content-Type":"application/json"},body:JSON.stringify({expiresIn:3600})});
  const data=await signed.json().catch(()=>({}));if(!signed.ok)return send(res,signed.status,{error:data.message||"Could not create PDF link."});
  res.statusCode=302;
  res.setHeader("Location",SUPABASE_URL+"/storage/v1"+data.signedURL);
  res.setHeader("Cache-Control","no-store");
  return res.end();
 }catch(e){return send(res,500,{error:e.message||"PDF unavailable."})}
}
