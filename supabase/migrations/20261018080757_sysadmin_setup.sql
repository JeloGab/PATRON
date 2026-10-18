insert into public.app_user
    (full_name, username, password_hash, role, must_change_password)
values
    ('System Administrator',
     'sysadmin',
     '$2b$12$MiYC4KRgveVmKZ3A7OKp9eFzIQBin4z4J5Ky2htfWXsNhQpen78/S',
     'sysadmin',
     true)
on conflict (lower(username)) do nothing;

alter role patron_admin password '06wKJaLWKKjzyRKo7DiJq7Eu';
