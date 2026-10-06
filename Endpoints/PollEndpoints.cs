using System.Globalization;
using System.Text;
using Live_poll.Data;
using Live_poll.Dtos;
using Microsoft.EntityFrameworkCore;

namespace Live_poll.Endpoints;

public static class PollEndpoints
{
    public static void MapPollEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/polls");

        group.MapPost("", async (CreatePollRequest request, AppDbContext db) =>
        {
            var question = request.Question?.Trim();
            if (string.IsNullOrWhiteSpace(question))
            {
                return Results.BadRequest(new ErrorResponse("Question is required."));
            }

            var options = request.Options ?? new List<string>();
            if (options.Count < 2 || options.Count > 6)
            {
                return Results.BadRequest(new ErrorResponse("Poll must have between 2 and 6 options."));
            }

            var normalizedOptions = options
                .Select(o => o?.Trim() ?? string.Empty)
                .ToList();

            if (normalizedOptions.Any(string.IsNullOrWhiteSpace))
            {
                return Results.BadRequest(new ErrorResponse("All options must be non-empty."));
            }

            var sessionKey = await GenerateUniqueSessionKeyAsync(db);
            var slug = GenerateSlug(question, sessionKey);

            var poll = new Poll
            {
                SessionKey = sessionKey,
                Slug = slug,
                Question = question,
                CreatedAt = DateTime.UtcNow,
                ClosedAt = null,
                Options = normalizedOptions
                    .Select((text, index) => new PollOption { Text = text })
                    .ToList()
            };

            db.Polls.Add(poll);
            await db.SaveChangesAsync();

            var response = new CreatePollResponse
            {
                Slug = poll.Slug,
                SessionKey = poll.SessionKey,
                Question = poll.Question,
                Options = poll.Options
                    .OrderBy(o => o.Id)
                    .Select(o => new PollOptionSummaryDto { Id = o.Id, Text = o.Text })
                    .ToList()
            };

            return Results.Created($"/api/polls/{poll.Slug}", response);
        });

        group.MapGet("", async (AppDbContext db) =>
        {
            var polls = await db.Polls
                .AsNoTracking()
                .Include(p => p.Participants)
                .OrderByDescending(p => p.CreatedAt)
                .ThenByDescending(p => p.Id)
                .Select(p => new PollListItemResponse
                {
                    Slug = p.Slug,
                    SessionKey = p.SessionKey,
                    Question = p.Question,
                    CreatedAt = p.CreatedAt,
                    ClosedAt = p.ClosedAt,
                    ParticipantCount = p.Participants.Count
                })
                .ToListAsync();

            return Results.Json(polls);
        });

        group.MapGet("{slug}", async (string slug, AppDbContext db) =>
        {
            var poll = await db.Polls
                .AsNoTracking()
                .Include(p => p.Options)
                .FirstOrDefaultAsync(p => p.Slug == slug);

            if (poll is null)
            {
                return Results.NotFound(new ErrorResponse("Poll not found."));
            }

            var response = new PollDetailResponse
            {
                Slug = poll.Slug,
                SessionKey = poll.SessionKey,
                Question = poll.Question,
                IsClosed = poll.ClosedAt.HasValue,
                Options = poll.Options
                    .OrderBy(o => o.Id)
                    .Select(o => new PollOptionSummaryDto { Id = o.Id, Text = o.Text })
                    .ToList()
            };

            return Results.Json(response);
        });

        group.MapDelete("{slug}", async (string slug, AppDbContext db) =>
        {
            var poll = await db.Polls
                .Include(p => p.Options)
                .Include(p => p.Participants)
                .FirstOrDefaultAsync(p => p.Slug == slug);

            if (poll is null)
            {
                return Results.NotFound(new ErrorResponse("Poll not found."));
            }

            db.Polls.Remove(poll);
            await db.SaveChangesAsync();
            return Results.NoContent();
        });

        group.MapPost("{slug}/close", async (string slug, AppDbContext db) =>
        {
            var poll = await db.Polls.FirstOrDefaultAsync(p => p.Slug == slug);
            if (poll is null)
            {
                return Results.NotFound(new ErrorResponse("Poll not found."));
            }

            if (poll.ClosedAt.HasValue)
            {
                return Results.Conflict(new ErrorResponse("Poll is already closed."));
            }

            poll.ClosedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();

            return Results.Json(new { slug = poll.Slug, isClosed = true, closedAt = poll.ClosedAt });
        });

        group.MapGet("{slug}/status", async (string slug, AppDbContext db) =>
        {
            var poll = await db.Polls
                .AsNoTracking()
                .Include(p => p.Options)
                .Include(p => p.Participants)
                .FirstOrDefaultAsync(p => p.Slug == slug);

            if (poll is null)
            {
                return Results.NotFound(new ErrorResponse("Poll not found."));
            }

            var results = poll.Options
                .OrderBy(o => o.Id)
                .Select(option => new PollResultRowDto
                {
                    OptionId = option.Id,
                    Text = option.Text,
                    Count = poll.Participants.Count(p => p.OptionId == option.Id)
                })
                .ToList();

            var response = new PollStatusResponse
            {
                IsClosed = poll.ClosedAt.HasValue,
                ParticipantCount = poll.Participants.Count,
                VoteCount = poll.Participants.Count(p => p.OptionId.HasValue),
                Results = results
            };

            return Results.Json(response);
        });

        group.MapGet("by-key/{sessionKey}", async (string sessionKey, AppDbContext db) =>
        {
            var key = sessionKey.Trim();
            var poll = await db.Polls
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.SessionKey.ToLower() == key.ToLower());

            if (poll is null)
            {
                return Results.NotFound(new ErrorResponse("Poll not found."));
            }

            var response = new PollByKeyResponse
            {
                Slug = poll.Slug,
                Question = poll.Question,
                IsClosed = poll.ClosedAt.HasValue
            };
            return Results.Json(response);
        });

        group.MapGet("{slug}/participants/{nickname}", async (string slug, string nickname, AppDbContext db) =>
        {
            var poll = await db.Polls
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.Slug == slug);

            if (poll is null)
            {
                return Results.NotFound(new ErrorResponse("Poll not found."));
            }

            var participant = await db.Participants
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.PollId == poll.Id && p.Nickname == nickname);

            if (participant is null)
            {
                return Results.NotFound(new ErrorResponse("Participant not found."));
            }

            return Results.Json(new ParticipantStatusResponse
            {
                Nickname = participant.Nickname,
                HasVoted = participant.OptionId.HasValue
            });
        });

        group.MapPost("{slug}/participants", async (string slug, ParticipantCreateRequest request, AppDbContext db) =>
        {
            var poll = await db.Polls
                .Include(p => p.Participants)
                .FirstOrDefaultAsync(p => p.Slug == slug);

            if (poll is null)
            {
                return Results.NotFound(new ErrorResponse("Poll not found."));
            }

            var nickname = request.Nickname?.Trim();
            if (string.IsNullOrWhiteSpace(nickname))
            {
                return Results.BadRequest(new ErrorResponse("Nickname is required."));
            }

            var existingParticipant = poll.Participants.FirstOrDefault(p => p.Nickname == nickname);
            if (existingParticipant is not null)
            {
                return Results.Ok(new ParticipantStatusResponse
                {
                    Nickname = existingParticipant.Nickname,
                    HasVoted = existingParticipant.OptionId.HasValue
                });
            }

            var participant = new Participant
            {
                PollId = poll.Id,
                Nickname = nickname,
                OptionId = null
            };

            db.Participants.Add(participant);
            await db.SaveChangesAsync();

            return Results.Created($"/api/polls/{poll.Slug}/participants/{Uri.EscapeDataString(nickname)}", new ParticipantStatusResponse
            {
                Nickname = participant.Nickname,
                HasVoted = false
            });
        });

        group.MapPost("{slug}/votes", async (string slug, VoteRequest request, AppDbContext db) =>
        {
            var poll = await db.Polls
                .Include(p => p.Options)
                .Include(p => p.Participants)
                .FirstOrDefaultAsync(p => p.Slug == slug);

            if (poll is null)
            {
                return Results.NotFound(new ErrorResponse("Poll not found."));
            }

            if (poll.ClosedAt.HasValue)
            {
                return Results.Conflict(new ErrorResponse("Poll is closed."));
            }

            var participant = poll.Participants.FirstOrDefault(p => p.Nickname == request.Nickname);
            if (participant is null)
            {
                return Results.NotFound(new ErrorResponse("Participant not found."));
            }

            var selectedOption = poll.Options.FirstOrDefault(o => o.Id == request.OptionId);
            if (selectedOption is null)
            {
                return Results.BadRequest(new ErrorResponse("Option does not belong to this poll."));
            }

            if (participant.OptionId.HasValue)
            {
                return Results.Conflict(new ErrorResponse("Participant has already voted."));
            }

            participant.OptionId = request.OptionId;
            await db.SaveChangesAsync();

            return Results.Json(new { hasVoted = true });
        });

        group.MapGet("{slug}/results", async (string slug, string nickname, AppDbContext db) =>
        {
            var poll = await db.Polls
                .AsNoTracking()
                .Include(p => p.Options)
                .Include(p => p.Participants)
                .FirstOrDefaultAsync(p => p.Slug == slug);

            if (poll is null)
            {
                return Results.NotFound(new ErrorResponse("Poll not found."));
            }

            var participant = poll.Participants.FirstOrDefault(p => p.Nickname == nickname);
            if (participant is null)
            {
                return Results.NotFound(new ErrorResponse("Participant not found."));
            }

            if (!poll.ClosedAt.HasValue)
            {
                return Results.Json(new ErrorResponse("Poll is still open."), statusCode: StatusCodes.Status403Forbidden);
            }

            var status = BuildStatusFromPoll(poll);
            return Results.Json(status);
        });
    }

    private static async Task<string> GenerateUniqueSessionKeyAsync(AppDbContext db)
    {
        while (true)
        {
            var builder = new StringBuilder();
            for (var i = 0; i < 6; i++)
            {
                var value = Random.Shared.Next(0, 36);
                builder.Append(value < 10 ? (char)('0' + value) : (char)('A' + value - 10));
            }

            var key = builder.ToString();
            var exists = await db.Polls.AnyAsync(p => p.SessionKey == key);
            if (!exists)
            {
                return key;
            }
        }
    }

    private static string GenerateSlug(string question, string sessionKey)
    {
        var text = question.Trim();
        if (string.IsNullOrWhiteSpace(text))
        {
            text = "poll";
        }

        var normalized = text.Normalize(NormalizationForm.FormD);
        var builder = new StringBuilder();

        foreach (var c in normalized)
        {
            var category = CharUnicodeInfo.GetUnicodeCategory(c);
            if (category == UnicodeCategory.NonSpacingMark)
            {
                continue;
            }

            if (char.IsLetterOrDigit(c))
            {
                builder.Append(char.ToLowerInvariant(c));
            }
            else if (builder.Length > 0 && builder[^1] != '-')
            {
                builder.Append('-');
            }
        }

        var slugBase = builder.ToString().Trim('-');
        while (slugBase.Contains("--"))
        {
            slugBase = slugBase.Replace("--", "-");
        }

        if (string.IsNullOrWhiteSpace(slugBase))
        {
            slugBase = "poll";
        }

        if (slugBase.Length > 100)
        {
            slugBase = slugBase.Substring(0, 100).Trim('-');
        }

        return $"{slugBase}-{sessionKey.ToLowerInvariant()}";
    }

    private static async Task<PollStatusResponse> BuildStatusResponseAsync(AppDbContext db, Poll poll)
    {
        var options = await db.Options
            .AsNoTracking()
            .Where(o => o.PollId == poll.Id)
            .OrderBy(o => o.Id)
            .ToListAsync();

        var participants = await db.Participants
            .AsNoTracking()
            .Where(p => p.PollId == poll.Id)
            .ToListAsync();

        var results = options
            .Select(option => new PollResultRowDto
            {
                OptionId = option.Id,
                Text = option.Text,
                Count = participants.Count(p => p.OptionId == option.Id)
            })
            .ToList();

        return new PollStatusResponse
        {
            IsClosed = poll.ClosedAt.HasValue,
            ParticipantCount = participants.Count,
            VoteCount = participants.Count(p => p.OptionId.HasValue),
            Results = results
        };
    }

    private static PollStatusResponse BuildStatusFromPoll(Poll poll)
    {
        var results = poll.Options
            .OrderBy(o => o.Id)
            .Select(option => new PollResultRowDto
            {
                OptionId = option.Id,
                Text = option.Text,
                Count = poll.Participants.Count(p => p.OptionId == option.Id)
            })
            .ToList();

        return new PollStatusResponse
        {
            IsClosed = poll.ClosedAt.HasValue,
            ParticipantCount = poll.Participants.Count,
            VoteCount = poll.Participants.Count(p => p.OptionId.HasValue),
            Results = results
        };
    }
}
