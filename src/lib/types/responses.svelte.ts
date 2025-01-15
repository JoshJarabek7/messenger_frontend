interface GetUserResponse {
	id: string;
	username: string;
	email: string;
	display_name: string;
	s3_key?: string;
	online: boolean;
}
