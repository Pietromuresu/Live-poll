namespace Live_poll.Dtos;

public class CreatePollRequest
{
    public string? Question { get; set; }
    public List<string>? Options { get; set; }
}

public class CreatePollResponse
{
    public string Slug { get; set; } = string.Empty;
    public string SessionKey { get; set; } = string.Empty;
    public string Question { get; set; } = string.Empty;
    public List<PollOptionSummaryDto> Options { get; set; } = new();
}

public class PollOptionSummaryDto
{
    public int Id { get; set; }
    public string Text { get; set; } = string.Empty;
}

public class PollListItemResponse
{
    public string Slug { get; set; } = string.Empty;
    public string SessionKey { get; set; } = string.Empty;
    public string Question { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? ClosedAt { get; set; }
    public int ParticipantCount { get; set; }
}

public class PollDetailResponse
{
    public string Slug { get; set; } = string.Empty;
    public string SessionKey { get; set; } = string.Empty;
    public string Question { get; set; } = string.Empty;
    public bool IsClosed { get; set; }
    public List<PollOptionSummaryDto> Options { get; set; } = new();
}

public class PollStatusResponse
{
    public bool IsClosed { get; set; }
    public int ParticipantCount { get; set; }
    public int VoteCount { get; set; }
    public List<PollResultRowDto> Results { get; set; } = new();
}

public class PollResultRowDto
{
    public int OptionId { get; set; }
    public string Text { get; set; } = string.Empty;
    public int Count { get; set; }
}

public class PollByKeyResponse
{
    public string Slug { get; set; } = string.Empty;
    public string Question { get; set; } = string.Empty;
    public bool IsClosed { get; set; }
}

public class ParticipantStatusResponse
{
    public string Nickname { get; set; } = string.Empty;
    public bool HasVoted { get; set; }
}

public class ParticipantCreateRequest
{
    public string? Nickname { get; set; }
}

public class VoteRequest
{
    public string? Nickname { get; set; }
    public int OptionId { get; set; }
}

public class ErrorResponse
{
    public ErrorResponse()
    {
    }

    public ErrorResponse(string error)
    {
        Error = error;
    }

    public string Error { get; set; } = string.Empty;
}
