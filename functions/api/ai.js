const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
export async function onRequestPost({request,env}) {
  if (!env.OPENAI_API_KEY) return json({error:"AI backend chưa được cấu hình. Hãy thêm OPENAI_API_KEY trong Cloudflare Pages settings."},503);
  let body;
  try { body=await request.json(); } catch { return json({error:"Dữ liệu gửi lên không phải JSON hợp lệ."},400); }
  const question=typeof body.question==="string"?body.question.trim():"";
  if (!question) return json({error:"Vui lòng nhập câu hỏi."},400);
  if (question.length>1200) return json({error:"Câu hỏi tối đa 1200 ký tự."},413);
  const origin=request.headers.get("Origin");
  const host=new URL(request.url).host;
  if (origin) { try { if(new URL(origin).host!==host) return json({error:"Origin không được phép."},403); } catch { return json({error:"Origin không hợp lệ."},403); } }
  const model=env.OPENAI_MODEL||"gpt-4.1-mini";
  let upstream;
  try {
    upstream=await fetch("https://api.openai.com/v1/responses",{
      method:"POST",
      headers:{"Authorization":"Bearer "+env.OPENAI_API_KEY,"Content-Type":"application/json"},
      body:JSON.stringify({
        model,
        instructions:"Bạn là Studio AI, trợ lý kỹ thuật cho Bedrock Coder Studio và Minecraft Bedrock Add-ons. Trả lời bằng tiếng Việt trừ khi người dùng dùng ngôn ngữ khác. Rõ ràng, thực tế, ưu tiên ví dụ ngắn. Không bịa API, phiên bản, đường dẫn hay khả năng tương thích. Nếu chưa chắc, nói rõ và khuyên kiểm tra tài liệu Microsoft Learn chính thức. Phân biệt cú pháp JSON hợp lệ với schema Minecraft hợp lệ. Không yêu cầu người dùng gửi API key hoặc bí mật. Không khẳng định đã chạy thử code nếu chưa chạy.",
        input:question,
        max_output_tokens:700,
        store:false
      })
    });
  } catch { return json({error:"Không kết nối được dịch vụ AI. Hãy thử lại sau."},502); }
  let data;
  try { data=await upstream.json(); } catch { return json({error:"Dịch vụ AI trả về dữ liệu không đọc được."},502); }
  if (!upstream.ok) return json({error:upstream.status===429?"AI đang bận hoặc đã chạm giới hạn sử dụng. Hãy thử lại sau.":upstream.status===401?"Khóa API phía máy chủ chưa hợp lệ.":"Dịch vụ AI hiện không trả lời được."},upstream.status===429?429:502);
  let answer="";
  for(const item of data.output||[]) if(item.type==="message") for(const c of item.content||[]) if(c.type==="output_text") answer+=c.text||"";
  if(!answer.trim()) return json({error:"AI chưa tạo được câu trả lời. Hãy thử hỏi lại cụ thể hơn."},502);
  return json({answer:answer.trim()});
}
export async function onRequest({request}) {
  if(request.method==="OPTIONS") return new Response(null,{status:204,headers:{"Allow":"POST, OPTIONS"}});
  return json({error:"Chỉ hỗ trợ POST."},405);
}
