create or replace function public.linride_auto_confirm_auth_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is not null and new.email_confirmed_at is null then
    new.email_confirmed_at := coalesce(new.created_at, now());
    new.confirmation_token := '';
  end if;

  return new;
end;
$$;

revoke all on function public.linride_auto_confirm_auth_email() from public;

drop trigger if exists linride_auto_confirm_email on auth.users;
create trigger linride_auto_confirm_email
before insert on auth.users
for each row
execute function public.linride_auto_confirm_auth_email();

update auth.users
set email_confirmed_at = coalesce(email_confirmed_at, now()),
    confirmation_token = '',
    updated_at = now()
where email is not null
  and email_confirmed_at is null
  and coalesce(encrypted_password, '') <> '';
