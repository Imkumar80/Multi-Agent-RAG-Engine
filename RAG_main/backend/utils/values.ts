export enum ResponseStatus{
    success = 200,
    unauthorized = 401,
    notFound = 404,
    internalServerError = 500,
    clientError = 400
}

export enum userType {
    researcher = "researcher",
    intern = "intern",
    mentor = "mentor"
}