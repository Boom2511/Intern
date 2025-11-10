# Test Department Flex Message
$body = @{
    groupId = "Cad0f444d4cb63b528704d8d7c6c03239"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/line/test-department-flex" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body
