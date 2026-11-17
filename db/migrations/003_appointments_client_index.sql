-- Bir danışanın geçmiş randevularını (hatırlatma özeti için) hızlı bulmak için
CREATE INDEX appointments_user_client_idx ON appointments (user_id, client_id);
