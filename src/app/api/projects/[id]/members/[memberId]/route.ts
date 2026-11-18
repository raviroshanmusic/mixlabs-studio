import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function DELETE(_request: NextRequest, {params}: {params: Promise<{id:string; memberId:string}>}) {
  const {id,memberId}=await params;
  const db=await createClient();
  const {data:{user}}=await db.auth.getUser();
  if(!user)return NextResponse.json({error:'Not authenticated'},{status:401});
  const {data,error}=await db.rpc('remove_project_member',{pid:id,mid:memberId});
  if(error){
    if(error.code==='42501')return NextResponse.json({error:'Only this project’s owner and admins can remove members'},{status:403});
    if(error.code==='23514')return NextResponse.json({error:'The project owner cannot be removed'},{status:409});
    console.error('Project member removal failed',error);
    return NextResponse.json({error:'Could not remove this member. Please try again.'},{status:500});
  }
  if(!data)return NextResponse.json({error:'Member not found in this project'},{status:404});
  return NextResponse.json({ok:true});
}
